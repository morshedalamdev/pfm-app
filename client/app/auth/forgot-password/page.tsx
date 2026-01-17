import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
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
      <form className="w-full my-6">
        <FieldSet>
          <FieldGroup>
            <Field data-invalid>
              <Input type="email" placeholder="Email" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field>
              <Button type="submit" className="bg-stone-100 text-black">
                Send Code
              </Button>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
      <form className="hidden w-full my-6">
        <FieldSet>
          <FieldGroup>
            <Field>
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
            </Field>
            <Field>
              <Button type="submit" className="bg-stone-100 text-black">
                Confirm
              </Button>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </section>
  );
}
