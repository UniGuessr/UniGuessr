"use client";

import { useState } from "react";
import { PixelButton } from "@/components/pixel-button";

export const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <PixelButton variant="secondary" onClick={() => setCount(count + 1)}>
      Count is {count}
    </PixelButton>
  );
};
