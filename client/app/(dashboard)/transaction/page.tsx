import DateFilter from "@/components/DateFilter";
import FilterBox from "@/components/FilterBox";
import FilterMenu from "@/components/FilterMenu";
import Header from "@/components/Header";
import SortBox from "@/components/SortBox";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  BriefcaseBusiness,
  CarFront,
  ChevronRight,
  Ellipsis,
  Gamepad2,
  Plus,
  Search,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  SlidersHorizontal,
  Utensils,
} from "lucide-react";
import Link from "next/link";

export default function Transaction() {
  return (
    <main className="flex flex-col h-dvh">
      <Header title="Transaction">
        <Link href="/transaction/create">
          <Plus className="size-3" />
        </Link>
      </Header>
      <section className="flex items-center justify-between gap-1 h-[58px] p-2">
        <InputGroup className="mr-2">
          <InputGroupInput placeholder="Search..." className="h-8" />
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
        </InputGroup>
        <FilterMenu />
        <DateFilter />
      </section>
      <section className="space-y-4 h-[calc(100%-106px)] pb-[70px] overflow-y-auto">
        <div className="space-y-2">
          <div className="sticky top-0 backdrop-blur-lg flex items-center justify-between border-b border-input py-1 px-2">
            <h3 className="font-bold">31 May</h3>
            <p className="text-xs">4 Transactions</p>
          </div>
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
            <div className="size-8 flex items-center justify-center border border-lime-400 text-lime-400 to-lime-400/50 bg-linear-to-t from-black rounded-md">
              <ShoppingBag />
            </div>
            <div className="flex-1 px-2">
              <h5 className="text-stone-400 text-xs">Yesterday</h5>
              <h3 className="font-bold text-base line-clamp-1">
                Balenciaga Inc.
              </h3>
            </div>
            <div className="flex items-center">
              <h4 className="font-semibold text-red-500 mr-2">- $944.90</h4>
              <Button variant="link" size="icon-sm" className="x-icon-bg">
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap px-3">
            <div className="size-8 flex items-center justify-center border border-amber-400 text-amber-500 to-amber-500/50 bg-linear-to-t from-black rounded-md">
              <Gamepad2 />
            </div>
            <div className="flex-1 px-2">
              <h5 className="text-stone-400 text-xs">Feb 1, 2026</h5>
              <h3 className="font-bold text-base line-clamp-1">
                Playstation Store
              </h3>
            </div>
            <div className="flex items-center">
              <h4 className="font-semibold text-red-500 mr-2">- $22.20</h4>
              <Button variant="link" size="icon-sm" className="x-icon-bg">
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="sticky top-0 backdrop-blur-lg flex items-center justify-between border-b border-input py-1 px-2">
            <h3 className="font-bold">01 Jun</h3>
            <p className="text-xs">1 Transactions</p>
          </div>
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
            <div className="size-8 flex items-center justify-center border border-lime-400 text-lime-400 to-lime-400/50 bg-linear-to-t from-black rounded-md">
              <ShoppingBag />
            </div>
            <div className="flex-1 px-2">
              <h5 className="text-stone-400 text-xs">Yesterday</h5>
              <h3 className="font-bold text-base line-clamp-1">
                Balenciaga Inc.
              </h3>
            </div>
            <div className="flex items-center">
              <h4 className="font-semibold text-red-500 mr-2">- $944.90</h4>
              <Button variant="link" size="icon-sm" className="x-icon-bg">
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap px-3">
            <div className="size-8 flex items-center justify-center border border-amber-400 text-amber-500 to-amber-500/50 bg-linear-to-t from-black rounded-md">
              <Gamepad2 />
            </div>
            <div className="flex-1 px-2">
              <h5 className="text-stone-400 text-xs">Feb 1, 2026</h5>
              <h3 className="font-bold text-base line-clamp-1">
                Playstation Store
              </h3>
            </div>
            <div className="flex items-center">
              <h4 className="font-semibold text-red-500 mr-2">- $22.20</h4>
              <Button variant="link" size="icon-sm" className="x-icon-bg">
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="sticky top-0 backdrop-blur-lg flex items-center justify-between border-b border-input py-1 px-2">
            <h3 className="font-bold">31 May</h3>
            <p className="text-xs">4 Transactions</p>
          </div>
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
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
          <div className="flex flex-wrap px-3">
            <div className="size-8 flex items-center justify-center border border-lime-400 text-lime-400 to-lime-400/50 bg-linear-to-t from-black rounded-md">
              <ShoppingBag />
            </div>
            <div className="flex-1 px-2">
              <h5 className="text-stone-400 text-xs">Yesterday</h5>
              <h3 className="font-bold text-base line-clamp-1">
                Balenciaga Inc.
              </h3>
            </div>
            <div className="flex items-center">
              <h4 className="font-semibold text-red-500 mr-2">- $944.90</h4>
              <Button variant="link" size="icon-sm" className="x-icon-bg">
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap px-3">
            <div className="size-8 flex items-center justify-center border border-amber-400 text-amber-500 to-amber-500/50 bg-linear-to-t from-black rounded-md">
              <Gamepad2 />
            </div>
            <div className="flex-1 px-2">
              <h5 className="text-stone-400 text-xs">Feb 1, 2026</h5>
              <h3 className="font-bold text-base line-clamp-1">
                Playstation Store
              </h3>
            </div>
            <div className="flex items-center">
              <h4 className="font-semibold text-red-500 mr-2">- $22.20</h4>
              <Button variant="link" size="icon-sm" className="x-icon-bg">
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
