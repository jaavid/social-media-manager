import Content from '@/features/CookiePolicyPage';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("خط مشی کوکی", "ما از کوکی‌ها (و فناوری‌های مشابه) استفاده می‌کنیم تا شما را به سیستم وارد نگه داریم، تنظیمات برگزیده‌تان را به خاطر بسپارید و بفهمیم چه چیزی کار می‌کند. این صفحه دقیقاً توضیح می‌دهد که ما از چه چیزی استفاده می کنیم و به شما امکان می‌دهد انتخاب کنید.", "/cookies", false);
export default function Page() { return <Content />; }
