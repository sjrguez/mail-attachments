import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios'
import { existsSync, readFile, readFileSync, writeFileSync } from 'fs';
import { promisify } from 'util';
import * as mailParser from 'mailParser'
import * as path from 'path';

const readFileAsync = promisify(readFile);
@Injectable()
export class MailService {

    async executeParse(url: string) {  
        let mailContent: string
        if(url.startsWith('http')) {
            mailContent = await this.emailContentByUrl(url)
        } else {
            mailContent = await this.mailContentByPathfile(url)
        }

        console.log(mailContent)
        const { attachments } = await mailParser.simpleParser(mailContent);
        const jsonAttachment = attachments.find((attachment) => attachment.contentType === 'application/json');

        if(!jsonAttachment) throw new BadRequestException("There is not json attachment found in the mail")
        const jsonInfo = jsonAttachment.content.toString('utf-8');
        const tempFile = path.join(__dirname,"temp.json");
        writeFileSync(tempFile, jsonInfo );

        return  {
            jsonLinkInline: `<a href="data:application/json;base64,${Buffer.from(jsonInfo).toString('base64')}" download="parsed.json">Download JSON</a>`,
            jsonLinkWebpage: `<a href="/json-viewer">View JSON on Webpage</a>`,
            jsonFile: {
                originalname: "parsed.json",
                buffer: readFileSync(tempFile)
            },
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

}
