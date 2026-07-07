import {Metadata} from "next";
import Header from "@/app/components/Header";

export const metadata: Metadata = {
    title: "Soullink Edit",
};

export default function SiteLayout({children}: { children: React.ReactNode }) {
    return <div className="page-bg min-h-screen"><Header/>{children}</div>
}
