import { Shell } from "@/app/Guard";
export default function Layout({ children }) { return <Shell admin={false}>{children}</Shell>; }
