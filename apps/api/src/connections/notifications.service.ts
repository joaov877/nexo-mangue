import { Injectable, Logger } from '@nestjs/common';

type NotificationKind = 'interest' | 'mutual';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * E-mail transacional opcional via Resend.
   * Sem as variáveis de ambiente, o MVP continua funcionando sem enviar e-mails.
   * Falhas do provedor não desfazem uma ação de conexão já persistida.
   */
  async interestReceived(to: string, recipientName: string, senderName: string): Promise<void> {
    await this.send({
      to,
      kind: 'interest',
      subject: 'Você recebeu um novo interesse no Nexo Mangue',
      title: 'Alguém quer conhecer você',
      greeting: recipientName,
      body: `${senderName} demonstrou interesse no seu perfil. Entre no Nexo Mangue para revisar o interesse e decidir se deseja corresponder.`,
    });
  }

  async mutualConnection(to: string, recipientName: string, otherName: string): Promise<void> {
    await this.send({
      to,
      kind: 'mutual',
      subject: 'Você tem uma nova conexão no Nexo Mangue',
      title: 'O interesse é mútuo!',
      greeting: recipientName,
      body: `Você e ${otherName} demonstraram interesse um no outro. Acesse o Nexo Mangue para consultar a conexão e os dados de contato liberados.`,
    });
  }

  private async send(input: {
    to: string;
    kind: NotificationKind;
    subject: string;
    title: string;
    greeting: string;
    body: string;
  }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from) return;
    if (!input.to || !input.to.includes('@')) {
      this.logger.warn('Notificação de e-mail ignorada: destinatário inválido.');
      return;
    }

    const appUrl = (process.env.APP_URL?.trim() || 'http://localhost:5173').replace(/\/$/, '');
    const htmlEntities: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    };
    const escape = (value: string) => value.replace(/[&<>"']/g, (char) => htmlEntities[char] ?? char);
    const greeting = escape(input.greeting);
    const body = escape(input.body);
    const title = escape(input.title);
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b1a03">
      <h1 style="color:#4a2b02;font-size:24px">${title}</h1>
      <p>Olá, ${greeting}!</p><p>${body}</p>
      <p><a href="${escape(appUrl)}" style="display:inline-block;background:#4a2b02;color:#fff5df;padding:12px 18px;border-radius:8px;text-decoration:none">Abrir Nexo Mangue</a></p>
      <p style="color:#7a6649;font-size:12px">Mensagem automática do Nexo Mangue. Não responda a este e-mail.</p>
    </div>`;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [input.to], subject: input.subject, html, tags: [{ name: 'notification', value: input.kind }] }),
      });
      if (!response.ok) {
        this.logger.warn(`O provedor de e-mail recusou uma notificação (${response.status}).`);
      }
    } catch {
      this.logger.warn('Não foi possível enviar uma notificação por e-mail; a ação principal foi mantida.');
    }
  }
}
