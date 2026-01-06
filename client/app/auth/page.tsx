import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";

export default function Page () {
     return (
          <section className="flex flex-col h-full px-3 pb-9 justify-end">
               <div className="text-center space-y-4 mb-9">
                    <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} className="mx-auto" />
                    <h3 className="font-bold text-4xl tracking-wide">Welcome Back!</h3>
                    <h2 className="font-semibold text-2xl">Login or sign up</h2>
               </div>
               <form className="space-y-4">
                    <Input type="email" placeholder="Email" />
                    <Button type="submit" className="bg-stone-100 text-black">Continue</Button>
               </form>
               <div className="flex flex-wrap items-center justify-between my-9">
                    <hr className="w-5/12 border-b border-stone-600" />
                    <span className="text-stone-300">or</span>
                    <hr className="w-5/12 border-b border-stone-600" />
               </div>
               <div className="space-y-4">
                    <Button variant="outline">
                         <Image src={ICONS.GoogleIcon} alt="Google Icon" width={24} height={24} />
                         Continue with Google
                    </Button>
                    <Button variant="outline">
                         <Image src={ICONS.FacebookIcon} alt="Facebook Icon" width={24} height={24} />
                         Continue with Facebook
                    </Button>
                    <Button variant="outline">
                         <Image src={ICONS.AppleIcon} alt="Apple Icon" width={24} height={24} />
                         Continue with Apple
                    </Button>
               </div>
          </section>
     );
}