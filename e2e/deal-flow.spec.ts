import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Flujo Completo de Traspaso (E2E Multi-usuario)', () => {
  test('debería ejecutar el flujo completo desde la publicación hasta la valoración final', async ({ browser }) => {
    // 1. Crear contextos independientes para el Vendedor (Pablo) y el Comprador (Pol)
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();

    // 2. Iniciar sesión en ambos navegadores en paralelo
    await login(ownerPage, 'pablos@gmail.com', '123456');
    await login(buyerPage, 'pol@gmail.com', '123456');

    // ==========================================
    // PASO 1: El Propietario (Pablo) crea una oferta
    // ==========================================
    await ownerPage.goto('/ofertas/crear');
    await expect(ownerPage.locator('h1')).toHaveText('Vender ahora');

    // Rellenar formulario de la oferta
    await ownerPage.locator('select#sector').selectOption('Comercio');
    await ownerPage.locator('input#region').fill('Barcelona, Cataluña');
    await ownerPage.locator('select#revenueRange').selectOption('BETWEEN_100K_500K');
    await ownerPage.locator('select#employeeRange').selectOption('6_10');
    await ownerPage.locator('input#creationYear').fill('2015');

    const shortDesc = 'Librería con mucho encanto en el centro de Barcelona.';
    const extendedDesc = 'Librería histórica con gran volumen de negocio, clientela fiel, inventario completo y excelente ubicación. Se traspasa por jubilación del dueño actual.';
    await ownerPage.locator('textarea#companyDescription').fill(shortDesc);
    await ownerPage.locator('textarea#extendedDescription').fill(extendedDesc);

    // Enviar y esperar redirección
    await ownerPage.locator('button.btn-save').click();
    await ownerPage.waitForURL(/\/ofertas\/[a-f0-9]+$/);
    
    const offerUrl = ownerPage.url();
    const offerId = offerUrl.split('/').pop()!;
    console.log(`Oferta creada exitosamente con ID: ${offerId}`);

    // ==========================================
    // PASO 2: El Interesado (Pol) solicita la oferta
    // ==========================================
    await buyerPage.goto(`/ofertas/${offerId}`);
    
    // Debería ver el botón de solicitar
    const requestBtn = buyerPage.locator('button.btn-interest');
    await expect(requestBtn).toBeVisible();
    await requestBtn.click();

    // Rellenar el modal de solicitud
    const modal = buyerPage.locator('section.request-modal');
    await expect(modal).toBeVisible();

    await buyerPage.locator('textarea#professionalBackground').fill('Más de 8 años de experiencia en sector editorial y distribución.');
    await buyerPage.locator('input#preferredRegionsText').fill('Barcelona Centro, Gracia');
    await buyerPage.locator('textarea#bio').fill('Emprendedor local buscando continuar legados culturales.');
    await buyerPage.locator('input#availableCapital').fill('95000');
    await buyerPage.locator('select#financingNeeded').selectOption('false');
    await buyerPage.locator('input#ndaAccepted').check();

    // Adjuntar archivo de CV (PDF simulado en memoria)
    await buyerPage.locator('input#cvFile').setInputFiles({
      name: 'cv_pol.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 \n%...'),
    });

    // Enviar solicitud
    await buyerPage.locator('section.request-modal button[type="submit"].btn-save').click();
    await expect(modal).toBeHidden();
    
    // Debería ver banner de solicitud pendiente
    const statusBanner = buyerPage.locator('.status-banner.pending');
    await expect(statusBanner).toBeVisible();

    // ==========================================
    // PASO 3: El Propietario (Pablo) acepta la solicitud
    // ==========================================
    await ownerPage.goto('/mis-solicitudes');
    
    // Debería haber una solicitud recibida de "Pol Puig" para la oferta
    const requestCard = ownerPage.locator('.request-card', { hasText: 'Pol Puig' })
      .filter({ hasText: 'Comercio - Barcelona, Cataluña' })
      .first();
    await expect(requestCard).toBeVisible();

    // Aceptar solicitud
    await requestCard.locator('button.btn-accept').click();
    
    // Debería aparecer el botón para contactar
    const contactBtn = requestCard.locator('button.btn-contact');
    await expect(contactBtn).toBeVisible();

    // ==========================================
    // PASO 4: Chat y Mensajes
    // ==========================================
    await contactBtn.click(); // Redirige al chat
    await ownerPage.waitForURL(/\/chats\/[a-f0-9]+$/);

    // Obtener el ID del chat creado de la URL del propietario
    const ownerChatUrl = ownerPage.url();
    const chatId = ownerChatUrl.split('/').pop()!;

    // Enviar primer mensaje (el chat se inicia ya aprobado porque la solicitud fue previamente aceptada)
    const messageInput = ownerPage.locator('textarea#message-input');
    await messageInput.fill('Hola Pol, he revisado tu solicitud para la librería y me parece muy interesante. ¿Cuándo te viene bien hablar?');
    await ownerPage.locator('button#send-message-btn').click();

    // ==========================================
    // PASO 5: Comprador (Pol) responde en el chat
    // ==========================================
    // Navegar directamente a la URL del chat específico para evitar interferencias con chats antiguos
    await buyerPage.goto(`/chats/${chatId}`);
    await buyerPage.waitForURL(/\/chats\/[a-f0-9]+$/);

    // Verificar que recibe el mensaje de Pablo
    const lastTheirsMessage = buyerPage.locator('.message-row.theirs').last();
    await expect(lastTheirsMessage).toContainText('Hola Pol, he revisado tu solicitud');

    // Responder
    await buyerPage.locator('textarea#message-input').fill('Hola Pablo, gracias. Me vendría ideal reunirnos esta misma semana, tal vez el jueves por la tarde.');
    await buyerPage.locator('button#send-message-btn').click();

    // ==========================================
    // PASO 6: Finalización de la Venta (Ambos)
    // ==========================================
    // 6.1 Propietario (Pablo) inicia el cierre de venta
    await ownerPage.locator('button.btn-close-deal').click();
    
    // Debería mostrar estado de espera
    const ownerStatusPill = ownerPage.locator('.deal-status-pill');
    await expect(ownerStatusPill).toBeVisible();
    await expect(ownerStatusPill).toContainText('Esperando a la otra parte');

    // 6.2 Comprador (Pol) confirma el cierre de venta
    const buyerCloseBtn = buyerPage.locator('button.btn-close-deal');
    await expect(buyerCloseBtn).toBeVisible();
    await buyerCloseBtn.click();

    // Recargar ambas páginas para actualizar el estado del trato (la aplicación requiere refrescar
    // para sincronizar el estado final del cierre del trato 'closedAt' en ambos extremos).
    await ownerPage.reload();
    await buyerPage.reload();

    // ==========================================
    // PASO 7: Valoración Mutua
    // ==========================================
    // Ambos deberían ver ahora el panel de valoración (.deal-rating-panel)
    
    // 7.1 Propietario valora al Comprador (5 estrellas)
    await expect(ownerPage.locator('.deal-rating-panel')).toBeVisible();
    await ownerPage.locator('button[aria-label="5 estrellas"]').click();
    await ownerPage.locator('textarea.rating-comment').fill('Comprador excelente, muy serio y con las ideas muy claras sobre el negocio.');
    await ownerPage.locator('button.rating-submit').click();
    await expect(ownerPage.locator('.rating-sent')).toBeVisible();

    // 7.2 Comprador valora al Propietario (4 estrellas)
    await expect(buyerPage.locator('.deal-rating-panel')).toBeVisible();
    await buyerPage.locator('button[aria-label="4 estrellas"]').click();
    await buyerPage.locator('textarea.rating-comment').fill('Pablo ha sido muy amable y ha facilitado toda la información necesaria para el traspaso.');
    await buyerPage.locator('button.rating-submit').click();
    await expect(buyerPage.locator('.rating-sent')).toBeVisible();

    // Limpieza: Cerrar contextos
    await ownerContext.close();
    await buyerContext.close();
  });
});
