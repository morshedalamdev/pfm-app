"use client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { XIcon } from "lucide-react";

export default function BackBtn () {
  const router = useRouter();
     return (
        <Button
          variant="link"
          size="icon-sm"
          className="x-icon-bg"
          onClick={router.back}
        >
          <XIcon className="size-3" />
        </Button>
     );
}