import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;
  const originalUrl = process.env.APP_URL;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.RESEND_API_KEY = 'test_key';
    process.env.EMAIL_FROM = 'Nexo Mangue <notifications@example.test>';
    process.env.APP_URL = 'https://nexo.example.test';
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalFrom;
    if (originalUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalUrl;
  });

  it('envia uma notificação de interesse usando o provedor configurado', async () => {
    await new NotificationsService().interestReceived('pessoa@example.test', 'João', 'Startup A');
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test_key' }),
    }));
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.to).toEqual(['pessoa@example.test']);
    expect(payload.subject).toContain('interesse');
    expect(payload.html).toContain('Startup A');
  });

  it('não chama o provedor quando as credenciais não estão configuradas', async () => {
    delete process.env.RESEND_API_KEY;
    await new NotificationsService().mutualConnection('pessoa@example.test', 'João', 'Startup A');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('não propaga falha do provedor para a ação de conexão', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(new NotificationsService().mutualConnection('pessoa@example.test', 'João', 'Startup A')).resolves.toBeUndefined();
  });
});
