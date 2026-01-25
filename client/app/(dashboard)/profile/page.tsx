import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SquarePenIcon } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="flex flex-col h-dvh">
      <Header title="Profile" homeBtn={true} />
      <section className="px-3 space-y-3 mt-5">
        <form action="">
          <FieldSet>
            <FieldGroup>
              <div className="flex flex-col items-center gap-3">
                <div className="relative size-20 rounded-full">
                  <Skeleton className="size-20 rounded-full" />
                  <label
                    htmlFor="profileImage"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1"
                  >
                    <SquarePenIcon className="size-3.5" />
                  </label>
                  <input type="file" id="profileImage" className="hidden" />
                </div>
                <p className="font-medium">Change your photo</p>
              </div>
              <Field>
                <InputGroup>
                  <InputGroupInput placeholder="John Doe" />
                  <InputGroupAddon className="text-white font-bold">
                    Name:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <InputGroup>
                  <InputGroupInput placeholder="demon@mail.com" />
                  <InputGroupAddon className="text-white font-bold">
                    Email:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <InputGroup>
                  <InputGroupInput placeholder="01XXXXXXXXXX" />
                  <InputGroupAddon className="text-white font-bold">
                    Phone:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <InputGroup>
                  <Select>
                    <SelectTrigger className="border-0">
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
                  <InputGroupAddon className="text-white font-bold">
                    Occupation:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <InputGroup>
                  <InputGroupTextarea
                    placeholder="Write something about yourself"
                    className="pt-0"
                  />
                  <InputGroupAddon
                    align="block-start"
                    className="text-white font-bold"
                  >
                    About Me
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </section>
    </main>
  );
}
