import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="flex flex-col items-center justify-center h-full px-3 pb-9">
      <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} />
      <form className="w-full my-6">
        <FieldSet>
          <FieldGroup>
            <Field data-invalid>
              <Input type="email" placeholder="Email" data-invalid />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field data-invalid>
              <Input type="password" placeholder="Password" data-invalid />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field>
              <Button type="submit" >
                Log in
              </Button>
            </Field>
            <Field className="text-center">
              <Link href="/auth/forgot-password">Forgot Password?</Link>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </section>
  );
}
