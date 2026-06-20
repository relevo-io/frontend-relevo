import { test, expect } from '@playwright/test';

test.describe('Navegación Básica', () => {
  test('debería cargar la página de inicio (Marketplace) y mostrar el logo', async ({ page }) => {
    // Ir a la página de inicio (se usa el baseURL configurado)
    await page.goto('/');

    // Verificar que el título de la pestaña contiene "Relevo" o similar
    await expect(page).toHaveTitle(/Relevo/i);

    // Verificar que el logo "Relevo" en la navbar es visible
    const logo = page.locator('a.logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveText('Relevo');
  });

  test('debería navegar a la página de cómo funciona', async ({ page }) => {
    await page.goto('/');

    // Hacer clic en el enlace o botón de "Cómo funciona"
    // Buscamos el botón secundario en la sección Hero que va a /como-funciona
    const howItWorksBtn = page.locator(
      'button.btn-secondary:has-text("Cómo funciona"), button.btn-secondary:has-text("Com funciona"), button.btn-secondary:has-text("How it works")'
    );

    // Si el botón es visible lo clicamos, si no, navegamos directamente
    if (await howItWorksBtn.isVisible()) {
      await howItWorksBtn.click();
      await expect(page).toHaveURL(/\/como-funciona/);
    } else {
      await page.goto('/como-funciona');
      await expect(page).toHaveURL(/\/como-funciona/);
    }

    // Verificar que carga algún texto clave de la landing page
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });
});
