import MarketingLayout from '@/components/marketing/MarketingLayout';
import Content from '@/features/FeaturesPage';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("امکانات", "تحلیل و آمار بین پلتفرمی، ویرایشگر محتوا مبتنی بر هوش مصنوعی، صندوق ورودی یکپارچه، اتوماسیون، گزارش‌های برند اختصاصی، مجوزهای گروهی - هر گردش کاری که آژانس شما در یک پلتفرم نیاز دارد.", "/features", false);
export default function Page() { return <MarketingLayout><Content /></MarketingLayout>; }
