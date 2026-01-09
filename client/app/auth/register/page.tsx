import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <section className="flex flex-col items-center justify-end h-full px-3 pb-9">
      <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} />
      <form className="w-full flex flex-wrap space-y-4 my-6">
        <div className="w-1/2 space-y-px pr-2">
          <Input type="text" placeholder="First Name" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div>
        <div className="w-1/2 space-y-px pl-2">
          <Input type="text" placeholder="Last Name" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div>
        <div className="w-full">
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
        </div>
        <div className="w-full space-y-px">
          <Input type="tel" placeholder="Phone Number" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div>
        <div className="w-full space-y-px">
          <Input type="email" placeholder="Email" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div>
        <div className="w-full space-y-px">
          <Input type="password" placeholder="Password" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div>
        <div className="w-full space-y-px">
          <Input type="password" placeholder="Password" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div>
        <Button type="submit" className="bg-stone-100 text-black">
          Create Account
        </Button>
      </form>
      <Link href="/auth">Already have an account?</Link>
    </section>
  );
}
