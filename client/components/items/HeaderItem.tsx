export default function HeaderItem ({ title, amount }: { title: string; amount: string }) {
     return (
          <div className="bg-accent rounded-md p-2 flex flex-col font-bold">
          <h2 className="uppercase text-xs">{title}</h2>
          <h3 className="text-2xl text-right">{amount}</h3>
        </div>
     );
}