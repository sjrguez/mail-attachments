import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios'
import { existsSync, readFile, readFileSync, writeFileSync } from 'fs';
import { promisify } from 'util';
import * as mailParser from 'mailParser'
import * as path from 'path';
import {createTransport} from "nodemailer"
import { ConfigService } from '@nestjs/config';

const readFileAsync = promisify(readFile);

@Injectable()
export class MailService {
    constructor(private configService: ConfigService){
        if(!this.configService.get("MAIL")) {
            throw new InternalServerErrorException("Please set your mail on file .env ")
        }
    }

    async executeParse(url: string) {  
        let mailContent: string
        if(url.startsWith('http')) {
            mailContent = await this.emailContentByUrl(url)
        } else {
            mailContent = await this.mailContentByPathfile(url)
        }

        const { attachments } = await mailParser.simpleParser(mailContent);
        const jsonAttachment = attachments.find((attachment) => attachment.contentType === 'application/json');
        if(!jsonAttachment) throw new BadRequestException("There is not json attachment found in the mail")
        const jsonInfo = jsonAttachment.content.toString('utf-8');
        const jsonBase64 = `data:application/json;base64,${Buffer.from(jsonInfo).toString('base64')}`
        console.log(jsonAttachment.filename)
        let errorSendingMail = false;
        try {
            await this.sendMail(jsonAttachment.filename, jsonBase64)
        } catch (error) {
            errorSendingMail = true
        }

        return {
            errorSendingMail,
            originalname: jsonAttachment.filename,
            json: JSON.parse(jsonInfo),
        }
    }

    private async emailContentByUrl(url:string): Promise<string> {
        const response = await axios.get(url)
        if(response.status >= 400 ) {
            throw new BadRequestException(`Failed getting URL with status code ${response.status}`)
        }
        return response.data
    }

    private async mailContentByPathfile(filepath: string): Promise<string> {
        if(!existsSync(filepath)) {
            throw new BadRequestException(`File was not found at this path: ${filepath}`)    
        }

        return await readFileAsync(filepath, 'utf-8');
    }


    async sendMail(filename: string, fileBase64: string) {
        const config =  {
            host: 'smtp.gmail.com',
            port:587,
            auth: {
                user: this.configService.get("MAIL"),
                pass: this.configService.get("PASSWORD")
            }
        }

        const mensaje = {
            from: this.configService.get("MAIL"),
            to: this.configService.get("SENDTO"),
            subject:"Mail attachment",
            text: `This is the mail with a JSON attachment,`,
            attachments: [
                {
                    filename,
                    path:fileBase64
                }
            ]
        }

        const transport = createTransport(config)
        try {
            await transport.sendMail(mensaje)
        } catch (error) {
            throw new InternalServerErrorException("Could not send a email")            
        }
    }
}
