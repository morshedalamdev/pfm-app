import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";

export default function Page () {
     return (
    <section className="flex flex-col items-center justify-center h-full px-3 pb-9">
      <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} />
      <form className="w-full space-y-4 my-6">
        <div className="space-y-px">
          <Input type="password" placeholder="Enter New Password" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div>
        <div className="space-y-px">
          <Input type="password" placeholder="Confirm Password" />
          <span className="hidden text-xs text-red-500">
            Please fill this field
          </span>
        </div> 
        <Button type="submit" className="bg-stone-100 text-black">
          Log in
        </Button>
      </form>
    </section>
     );
}