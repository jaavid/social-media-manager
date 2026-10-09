import Content from "@/features/SecurityPage.jsx";
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("امنیت", "رمزگذاری در حالت استراحت با Fernet، TLS 1.3 در حال انتقال، گزارش حسابرسی در هر اقدام، مطابق با GDPR + DPDP. SOC 2 Type II در حال انجام است.", "/security", false);
export default function Page() { return <Content />; }
