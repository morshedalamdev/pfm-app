import { RootChart } from "@/components/RootChart";
import { Button } from "@/components/ui/button";
import {BriefcaseBusiness, Car, CarFront, ChevronLeft,ChevronRight, Gamepad2, ShoppingBag, ShoppingBasket, ShoppingCart, Utensils } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col overflow-y-auto pb-[70px]">
      <section className="text-center my-6">
        <h2 className="text-stone-400 font-bold uppercase tracking-wide">available balance</h2>
        <h3 className="text-4xl font-bold">$2,483.39</h3>
      </section>
      <section className="grid grid-cols-3 gap-3 px-3 mb-4">
        <div className="border border-input rounded-md p-2 flex flex-col font-bold">
          <h2 className="uppercase text-xs">Income</h2>
          <h3 className="text-xl text-right">$5,000</h3>
        </div>
        <div className="border border-input rounded-md p-2 flex flex-col font-bold">
          <h2 className="uppercase text-xs">Expense</h2>
          <h3 className="text-xl text-right">$3,200</h3>
        </div>
        <div className="border border-input rounded-md p-2 flex flex-col font-bold">
          <h2 className="uppercase text-xs">Saved</h2>
          <h3 className="text-xl text-right">$1,800</h3>
        </div>
      </section>
      <section>
        <RootChart />
      </section>
      <section className="space-y-3 px-3">
        <h2 className="font-bold text-lg">Recent Transactions</h2>
        <div className="flex flex-wrap">
          <div className="size-8 flex items-center justify-center border border-indigo-400 text-indigo-400 to-indigo-400/50 bg-linear-to-t from-black rounded-md">
            <CarFront />
          </div>
          <div className="flex-1 px-2">
            <h5 className="text-stone-400 text-xs">Today</h5>
            <h3 className="font-bold text-base line-clamp-1">Uber</h3>
          </div>
          <div className="flex items-center">
            <h4 className="font-semibold text-red-500 mr-2">- $45.00</h4>
            <Button variant="link" size="icon-sm" className="x-icon-bg">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap">
          <div className="size-8 flex items-center justify-center border border-green-400 text-green-400 to-green-400/50 bg-linear-to-t from-black rounded-md">
            <Utensils />
          </div>
          <div className="flex-1 px-2">
            <h5 className="text-stone-400 text-xs">Today</h5>
            <h3 className="font-bold text-base line-clamp-1">Bolt Foods</h3>
          </div>
          <div className="flex items-center">
            <h4 className="font-semibold text-red-500 mr-2">- $34.90</h4>
            <Button variant="link" size="icon-sm" className="x-icon-bg">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap">
          <div className="size-8 flex items-center justify-center border border-teal-400 text-teal-400 to-teal-400/50 bg-linear-to-t from-black rounded-md">
            <ShoppingBasket />
          </div>
          <div className="flex-1 px-2">
            <h5 className="text-stone-400 text-xs">Today</h5>
            <h3 className="font-bold text-base line-clamp-1">Tomato</h3>
          </div>
          <div className="flex items-center">
            <h4 className="font-semibold text-red-500 mr-2">- $4.00</h4>
            <Button variant="link" size="icon-sm" className="x-icon-bg">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap">
          <div className="size-8 flex items-center justify-center border border-yellow-400 text-yellow-400 to-yellow-400/50 bg-linear-to-t from-black rounded-md">
            <BriefcaseBusiness />
          </div>
          <div className="flex-1 px-2">
            <h5 className="text-stone-400 text-xs">Yesterday</h5>
            <h3 className="font-bold text-base line-clamp-1">Salary</h3>
          </div>
          <div className="flex items-center">
            <h4 className="font-semibold text-green-500 mr-2">+ $9,500.00</h4>
            <Button variant="link" size="icon-sm" className="x-icon-bg">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap">
          <div className="size-8 flex items-center justify-center border border-fuchsia-400 text-fuchsia-400 to-fuchsia-400/50 bg-linear-to-t from-black rounded-md">
            <ShoppingCart />
          </div>
          <div className="flex-1 px-2">
            <h5 className="text-stone-400 text-xs">Today</h5>
            <h3 className="font-bold text-base line-clamp-1">Hoodie</h3>
          </div>
          <div className="flex items-center">
            <h4 className="font-semibold text-red-500 mr-2">- $19.00</h4>
            <Button variant="link" size="icon-sm" className="x-icon-bg">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap">
          <div className="size-8 flex items-center justify-center border border-lime-400 text-lime-400 to-lime-400/50 bg-linear-to-t from-black rounded-md">
            <ShoppingBag />
          </div>
          <div className="flex-1 px-2">
            <h5 className="text-stone-400 text-xs">Yesterday</h5>
            <h3 className="font-bold text-base line-clamp-1">Balenciaga Inc.</h3>
          </div>
          <div className="flex items-center">
            <h4 className="font-semibold text-red-500 mr-2">- $944.90</h4>
            <Button variant="link" size="icon-sm" className="x-icon-bg">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap">
          <div className="size-8 flex items-center justify-center border border-amber-400 text-amber-500 to-amber-500/50 bg-linear-to-t from-black rounded-md">
            <Gamepad2 />
          </div>
          <div className="flex-1 px-2">
            <h5 className="text-stone-400 text-xs">Feb 1, 2026</h5>
            <h3 className="font-bold text-base line-clamp-1">Playstation Store</h3>
          </div>
          <div className="flex items-center">
            <h4 className="font-semibold text-red-500 mr-2">- $22.20</h4>
            <Button variant="link" size="icon-sm" className="x-icon-bg">
              <ChevronRight />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}