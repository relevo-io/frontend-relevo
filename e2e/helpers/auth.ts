import { Page, expect } from '@playwright/test';

export async function login(page: Page, email = 'pablos@gmail.com', password = '123456') {
  // Ir a la página de login
  await page.goto('/login');

  // Rellenar campos del formulario
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);

  // Hacer click en submit
  const submitBtn = page.locator('button.btn-submit');
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  // Esperar a estar en la página de inicio (Marketplace)
  await expect(page).toHaveURL('/');
}
