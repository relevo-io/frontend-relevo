import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Flujo de Ofertas (Usuario Autenticado)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('debería visualizar el marketplace en estado autenticado', async ({ page }) => {
    // Ir a la página de inicio (Marketplace)
    await page.goto('/');

    // Verificar que al estar autenticado se muestran acciones exclusivas
    // como los botones de marcar favorito en las tarjetas de oferta
    const favoriteBtn = page.locator('button.favorite-btn').first();
    await expect(favoriteBtn).toBeVisible();

    // El candado de "Ver detalles" de los usuarios no logueados no debería mostrarse
    const lockedLabel = page.locator('.locked-details');
    await expect(lockedLabel).toHaveCount(0);
  });

  test('debería permitir crear una oferta y ver sus detalles tras la redirección', async ({ page }) => {
    // Navegar directamente al formulario de creación
    await page.goto('/ofertas/crear');

    // Confirmar que cargó el formulario
    await expect(page.locator('h1')).toHaveText('Vender ahora');

    // Rellenar los campos requeridos
    await page.locator('select#sector').selectOption('Servicios');
    await page.locator('input#region').fill('Girona, Cataluña');
    
    // Rellenar campos opcionales
    await page.locator('select#revenueRange').selectOption('BETWEEN_100K_500K');
    await page.locator('select#employeeRange').selectOption('6_10');
    await page.locator('input#creationYear').fill('2022');

    // Rellenar descripciones (deben superar la longitud mínima impuesta por los validadores)
    const shortDesc = 'Empresa de servicios de limpieza y mantenimiento industrial de locales.';
    const extendedDesc = 'Empresa con más de 10 años de experiencia en Girona. Cuenta con una cartera estable de más de 40 clientes recurrentes y facturación demostrable. El precio incluye equipamiento y periodo de transición.';

    await page.locator('textarea#companyDescription').fill(shortDesc);
    await page.locator('textarea#extendedDescription').fill(extendedDesc);

    // Hacer clic en Publicar
    const saveBtn = page.locator('button.btn-save');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Debería redirigirse automáticamente a la página de detalles de la oferta creada (/ofertas/:id)
    await expect(page).toHaveURL(/\/ofertas\/[a-f0-9]+$/);

    // Verificar que la página de detalles muestra correctamente la información introducida
    await expect(page.locator('span.sector')).toHaveText('Servicios');
    await expect(page.locator('h1')).toHaveText('Girona, Cataluña');
    
    // Validar facturación e información del año de creación
    await expect(page.locator('.meta-item strong').first()).toHaveText('100k-500k €');
    await expect(page.locator('.meta-item strong').nth(1)).toHaveText('2022');

    // Validar que las descripciones coinciden con lo ingresado
    await expect(page.locator('.description-block p').first()).toHaveText(shortDesc);
    await expect(page.locator('.description-block p').nth(1)).toHaveText(extendedDesc);
  });
});
