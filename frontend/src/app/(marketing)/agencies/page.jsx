import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("آژانس‌های شریک - راوینتا", "یک آژانس بازاریابی تایید شده بر اساس راوینتا پیدا کنید. بیش از 50 آژانس شریک در سرتاسر هند که از نظر انطباق، توانایی و نتایج مشتری بررسی شده‌اند.", "/agencies", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
