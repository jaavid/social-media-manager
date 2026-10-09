import { Shell } from "@/app/Guard";
export default function Layout({ children }) { return <Shell admin={true}>{children}</Shell>; }
