"use client";

import dynamic from "next/dynamic";

const PricingWidget = dynamic(() => import("./PricingWidget"), { ssr: false });

export default PricingWidget;
