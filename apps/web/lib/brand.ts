export const APP_BRAND_NAME = '小健';
export const APP_BRAND_MONOGRAM = '健';
export const APP_BRAND_DESCRIPTION = '训练饮食执行助手';

export function getBrandTitle(suffix: string) {
  return `${APP_BRAND_NAME} · ${suffix}`;
}
