import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <section className="flex flex-col items-center justify-end h-full px-3 pb-9">
      <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} />
      <form className="w-full my-6">
        <FieldSet>
          <FieldGroup>
            <Field data-invalid>
              <Input type="text" placeholder="First Name" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field data-invalid>
              <Input type="text" placeholder="Last Name" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field data-invalid>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select an occupation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Occupation</SelectLabel>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="nothing">Nothing</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {/* <FieldError errors={} /> */}
            </Field>
            <Field data-invalid>
              <Input type="tel" placeholder="Phone Number" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field data-invalid>
              <Input type="email" placeholder="Email" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field data-invalid>
              <Input type="password" placeholder="Password" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field data-invalid>
              <Input type="password" placeholder="Confirm Password" />
              {/* <FieldError errors={} /> */}
            </Field>
            <Field>
              <Button type="submit" >
                Create Account
              </Button>
            </Field>
            <Field className="text-center">
              <Link href="/auth">Already have an account?</Link>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </section>
  );
}
