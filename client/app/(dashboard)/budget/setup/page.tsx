"use client";

import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";
import BudgetInput from "@/components/inputs/BudgetInput";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CarFrontIcon,
  DollarSignIcon,
  HeartIcon,
  HouseIcon,
  PiggyBankIcon,
  ShoppingBagIcon,
  UtensilsCrossedIcon,
  ZapIcon,
} from "lucide-react";
import { Fragment, useState } from "react";

const EXPENSE_CATEGORY = [
  "Groceries",
  "Dining",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Shopping",
  "Travel",
  "Personal Care",
  "Gifts & Donations",
  "Bills & Fees",
  "Debt Payment",
  "Other",
];
export default function SetupBudgetPage() {
  const [open, setOpen] = useState(false);
  return (
    <Fragment>
      <Header homeBtn={true} title="Budget Setup">
        <BackBtn />
      </Header>
      <section className="p-3 pt-6">
        <Field className="mb-6">
          <FieldLabel>Monthly Income</FieldLabel>
          <FieldDescription>
            Include all sources of monthly income (after taxes)
          </FieldDescription>
          <InputGroup className="border-0 border-b rounded-none h-12">
            <InputGroupAddon>
              <InputGroupText>
                <DollarSignIcon />
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              type="number"
              placeholder="00,000.00"
              className="font-bold text-center text-5xl"
            />
          </InputGroup>
        </Field>
        <Tabs defaultValue="default" className="gap-3">
          <TabsList>
            <TabsTrigger value="default">Default</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="default">
            <form action="">
              <FieldSet>
                <FieldGroup>
                  <div>
                    <FieldLegend variant="legend">
                      Allocate Budget for Each Category
                    </FieldLegend>
                    <div className="bg-secondary/60 p-3 rounded-lg">
                      <div className="flex flex-wrap justify-between gap-3 mb-1.5">
                        <div>
                          <span className="text-input">Total</span>
                          <h4 className="font-bold text-xl">$2100.00</h4>
                        </div>
                        <div>
                          <span className="text-input">Allocated</span>
                          <h4 className="font-bold text-xl">$2100.00</h4>
                        </div>
                        <div>
                          <span className="text-input">Remaining</span>
                          <h4 className="font-bold text-xl text-green-500">
                            $2100.00
                          </h4>
                        </div>
                      </div>
                      <Progress value={40} className="h-2 mb-0.5" />
                      <div className="flex items-center justify-between">
                        <span className="text-input">60% allocated</span>
                        <span className="text-input">Savings 10%</span>
                      </div>
                    </div>
                  </div>
                  <Field>
                    <FieldLabel>Housing</FieldLabel>
                    <InputGroup>
                      <InputGroupInput placeholder="10,000.00" />
                      <InputGroupAddon>
                        <HouseIcon />
                      </InputGroupAddon>
                      <InputGroupAddon align="inline-end">20%</InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <FieldLabel>Food & Dining</FieldLabel>
                    <InputGroup>
                      <InputGroupInput placeholder="10,000.00" />
                      <InputGroupAddon>
                        <UtensilsCrossedIcon />
                      </InputGroupAddon>
                      <InputGroupAddon align="inline-end">10%</InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <FieldLabel>Transportation</FieldLabel>
                    <InputGroup>
                      <InputGroupInput placeholder="10,000.00" />
                      <InputGroupAddon>
                        <CarFrontIcon />
                      </InputGroupAddon>
                      <InputGroupAddon align="inline-end">8%</InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <FieldLabel>Utilities</FieldLabel>
                    <InputGroup>
                      <InputGroupInput placeholder="10,000.00" />
                      <InputGroupAddon>
                        <ZapIcon />
                      </InputGroupAddon>
                      <InputGroupAddon align="inline-end">6%</InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <FieldLabel>Healthcare</FieldLabel>
                    <InputGroup>
                      <InputGroupInput placeholder="10,000.00" />
                      <InputGroupAddon>
                        <HeartIcon />
                      </InputGroupAddon>
                      <InputGroupAddon align="inline-end">20%</InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <FieldLabel>Shopping</FieldLabel>
                    <InputGroup>
                      <InputGroupInput placeholder="10,000.00" />
                      <InputGroupAddon>
                        <ShoppingBagIcon />
                      </InputGroupAddon>
                      <InputGroupAddon align="inline-end">20%</InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <FieldLabel>Savings</FieldLabel>
                    <InputGroup>
                      <InputGroupInput placeholder="10,000.00" />
                      <InputGroupAddon>
                        <PiggyBankIcon />
                      </InputGroupAddon>
                      <InputGroupAddon align="inline-end">20%</InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <Button type="submit">Save Budget</Button>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </form>
          </TabsContent>
          <TabsContent value="custom">
            <form action="">
              <FieldSet>
                <FieldGroup>
                  <div>
                    <FieldLegend variant="legend">
                      Allocate Budget for Each Category
                    </FieldLegend>
                    <div className="bg-secondary/60 p-3 rounded-lg">
                      <div className="flex flex-wrap justify-between gap-3 mb-1.5">
                        <div>
                          <span className="text-input">Total</span>
                          <h4 className="font-bold text-xl">$2100.00</h4>
                        </div>
                        <div>
                          <span className="text-input">Allocated</span>
                          <h4 className="font-bold text-xl">$2100.00</h4>
                        </div>
                        <div>
                          <span className="text-input">Remaining</span>
                          <h4 className="font-bold text-xl text-green-500">
                            $2100.00
                          </h4>
                        </div>
                      </div>
                      <Progress value={40} className="h-2 mb-0.5" />
                      <div className="flex items-center justify-between">
                        <span className="text-input">60% allocated</span>
                        <span className="text-input">Savings 10%</span>
                      </div>
                    </div>
                  </div>
                  <BudgetInput />
                  <div className="mt-3">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-2 border-dashed"
                        >
                          Add Category
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <ul className="overflow-y-auto">
                          {EXPENSE_CATEGORY.map((category) => (
                            <li key={category}>
                              <Button
                                variant="ghost"
                                onClick={() => setOpen(false)}
                              >
                                {category}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Field>
                    <Button type="submit">Save Budget</Button>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </form>
          </TabsContent>
        </Tabs>
      </section>
    </Fragment>
  );
}
