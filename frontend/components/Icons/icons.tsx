import * as React from "react";

import { IconSvgProps } from "@/types";

export const BitmapChevron =({ className, ...props }: { className?: string, props: IconSvgProps }) => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 27 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M3.85715 3.85715H19.2857L23.0553 7.64066L17.5163 13.1595L22.8462 17.5055V23.1429H17.5055V13.1703L7.65696 22.9832L3.8874 19.2L13.9259 9.19781H3.85715V3.85715Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const TrophyIcon = ({ className, ...props }: IconSvgProps) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M6 4h12v5a6 6 0 0 1-12 0V4Z" />
      <path d="M6 6H3v1a4 4 0 0 0 4 4" />
      <path d="M18 6h3v1a4 4 0 0 1-4 4" />
      <path d="M12 15v3" />
      <path d="M8 21h8" />
      <path d="M9 21v-1a3 3 0 0 1 6 0v1" />
    </svg>
  );
};

export const MapPinPlusIcon = ({ className, ...props }: IconSvgProps) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z" />
      <path d="M12 7v6" />
      <path d="M9 10h6" />
    </svg>
  );
};

