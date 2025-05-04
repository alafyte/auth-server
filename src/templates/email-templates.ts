import { VerificationEmailOptions } from './interfaces/verification-email-options.interface';

export function verificationEmail(options: VerificationEmailOptions): string {
  return `
    Здравствуйте ${options.firstName} ${options.patronymic}!

    Вам необходимо подтвердить ваш адрес электронной почты на платформе "Курсы по математике". Для подверждения перейдите по ссылке:
    ${options.serverAddress}/auth/email/verify?token=${options.token}

    Обратите внимание, что ссылка действительна в течении 24 часов. Если вы не смогли подтвердить свой email в течении заданного срока, обратитесь к вашему администратору.`;
}