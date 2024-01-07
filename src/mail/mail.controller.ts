import { BadRequestException, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MailService } from './mail.service';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

@Controller('mail')
export class MailController {
    constructor(private mailService: MailService){}

    @Get('parse')
    @ApiQuery({ name: 'url', description: 'URL or path of the email file', required: true })
    @ApiResponse({ status: 200, description: 'Successfully parsed email and extracted JSON content' })
    @ApiResponse({ status: 400, description: 'Failed getting URL with status code' })
    @ApiResponse({ status: 400, description: 'File was not found' })
    @ApiResponse({ status: 400, description: 'There is not json attachment found in the mail' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    parseMail(@Query("url") url: string) {
        if(!url){
            throw new BadRequestException("No url or path was sent")
        }

        return this.mailService.executeParse(url);
    }

}
