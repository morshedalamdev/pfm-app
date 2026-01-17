import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";

export default function AuthPage() {
  return (
    <section className="flex flex-col h-full px-3 pb-9 justify-end">
      <div className="text-center space-y-4">
        <Image
          src={ICONS.RedIcon}
          alt="Red Icon"
          width={62}
          height={62}
          className="mx-auto"
        />
        <h3 className="font-bold text-4xl tracking-wide">Welcome Back</h3>
        <h2 className="font-semibold text-xl">Login or sign up</h2>
      </div>
      <form className="w-full my-6">
        <FieldSet>
          <FieldGroup>
            <Field data-invalid>
              <Input type="email" placeholder="Email" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field>
              <Button type="submit" >
                Continue
              </Button>
            </Field>
            <FieldSeparator>or</FieldSeparator>
            <Field>
              <Button variant="outline">
                <Image
                  src={ICONS.GoogleIcon}
                  alt="Google Icon"
                  width={24}
                  height={24}
                />
                Continue with Google
              </Button>
            </Field>
            <Field>
              <Button variant="outline">
                <Image
                  src={ICONS.FacebookIcon}
                  alt="Facebook Icon"
                  width={24}
                  height={24}
                />
                Continue with Facebook
              </Button>
            </Field>
            <Field>
              <Button variant="outline">
                <Image
                  src={ICONS.AppleIcon}
                  alt="Apple Icon"
                  width={24}
                  height={24}
                />
                Continue with Apple
              </Button>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
      <div className="space-y-4"></div>
    </section>
  );
}
