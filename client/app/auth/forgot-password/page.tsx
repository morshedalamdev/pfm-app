import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";

export default function ForgotPasswordPage() {
  return (
    <section className="flex flex-col items-center justify-center h-full px-3 pb-9">
      <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} />
      <form className="hidden w-full space-y-4 my-6">
        <div className="space-y-px">
          <Input type="email" placeholder="Email" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div>
        <Button type="submit" className="bg-stone-100 text-black">
          Send Code
        </Button>
      </form>
      <form className="w-full space-y-4 my-6">
        <div className="space-y-1">
          <InputOTP maxLength={4}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-center">
               Please enter the 4-digit code sent to your email
          </p>
        </div>
        <Button type="submit" className="bg-stone-100 text-black">
          Confirm
        </Button>
      </form>
    </section>
  );
}
