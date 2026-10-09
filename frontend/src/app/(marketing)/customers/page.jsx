import Content from "@/features/CustomersPage.jsx";
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("داستان های مشتری", "داستان‌های مشتریان در اینجا با راه‌اندازی عمومی راوینتا ظاهر می‌شوند. در عین حال، در اینجا نحوه ساخت محصول برای استفاده توسط صنعت آمده است.", "/customers", false);
export default function Page() { return <Content />; }
