import { test, expect } from '@playwright/test';

test.describe('Pruebas del Formulario de Login', () => {
  test.beforeEach(async ({ page }) => {
    // Ir a la página de login antes de cada test
    await page.goto('/login');
  });

  test('debería mostrar los campos del formulario y el botón de submit deshabilitado inicialmente', async ({
    page
  }) => {
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.locator('button.btn-submit');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Al estar los campos vacíos, el formulario es inválido y el botón de submit debería estar deshabilitado
    await expect(submitBtn).toBeDisabled();
  });

  test('debería habilitar el botón de submit cuando el formulario está completo', async ({ page }) => {
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.locator('button.btn-submit');

    // Completar el formulario con datos válidos sintácticamente
    await emailInput.fill('test@relevo.com');
    await passwordInput.fill('password123');

    // El botón debería habilitarse
    await expect(submitBtn).toBeEnabled();
  });

  test('debería mostrar error al intentar iniciar sesión con credenciales incorrectas', async ({ page }) => {
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.locator('button.btn-submit');

    // Introducir credenciales incorrectas ficticias
    await emailInput.fill('correo_incorrecto_inexistente@relevo.com');
    await passwordInput.fill('ClaveIncorrecta123');

    await expect(submitBtn).toBeEnabled();

    // Hacer click en submit
    await submitBtn.click();

    // Debería aparecer un mensaje de alerta de error en la página
    // (Por ejemplo, un elemento con clase .error-alert)
    const errorAlert = page.locator('.error-alert');
    await expect(errorAlert).toBeVisible();

    // Verificamos que el texto contiene algo descriptivo de error
    const errorText = await errorAlert.textContent();
    expect(errorText?.length).toBeGreaterThan(0);
  });
});
