import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";

export default function RecoverPasswordPage() {
  return (
    <section className="flex flex-col items-center justify-center h-full px-3 pb-9">
      <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} />
      <form className="w-full my-6">
        <FieldSet>
          <FieldGroup>
            <Field data-invalid>
              <Input type="password" placeholder="Enter New Password" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field data-invalid>
              <Input type="password" placeholder="Confirm Password" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field>
              <Button type="submit" >
                Log in
              </Button>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </section>
  );
}
