import { CircleDollarSign } from 'lucide-react'
import {
  PRICE_GUIDE,
  formatQtyBand,
  formatSellRange,
} from '../data/priceGuide'
import { money } from '../lib/utils'

export function CostInfo() {
  const crafted = PRICE_GUIDE.filter((g) => g.kind === 'crafted')
  const supply = PRICE_GUIDE.filter((g) => g.kind === 'supply')
  const external = PRICE_GUIDE.filter((g) => g.kind === 'external')

  if (PRICE_GUIDE.length === 0) {
    return (
      <section className="panel">
        <header className="panel-head">
          <h3>
            <CircleDollarSign size={16} /> Cost info · rate card
          </h3>
        </header>
        <p className="empty">
          Rate card floors fill in as craft recipes and sale prices are added
          from screenshots.
        </p>
      </section>
    )
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h3>
          <CircleDollarSign size={16} /> Cost info · baseline price list
        </h3>
      </header>
      <p className="muted panel-intro">
        Making = our store / craft cost. Selling = minimum (and typical range).
        Sales under the floor post to the <strong>cost alert</strong> Discord
        channel — except Family / Gang deals.
      </p>

      {crafted.length > 0 && <GuideTable title="Crafted products" rows={crafted} />}
      {supply.length > 0 && <GuideTable title="Supplies" rows={supply} />}
      {external.length > 0 && (
        <GuideTable title="External services" rows={external} />
      )}
    </section>
  )
}

function GuideTable({
  title,
  rows,
}: {
  title: string
  rows: typeof PRICE_GUIDE
}) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{title}</h4>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Making</th>
              <th>Qty band</th>
              <th>Selling</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) =>
              g.tiers.map((tier, i) => (
                <tr key={`${g.id}-${i}`}>
                  <td>{i === 0 ? g.name : ''}</td>
                  <td>
                    {i === 0
                      ? g.makingLabel ||
                        (g.pricingMode === 'percent'
                          ? `${g.makingCost}%`
                          : g.makingCost > 0
                            ? money(g.makingCost)
                            : '—')
                      : ''}
                  </td>
                  <td>{formatQtyBand(tier)}</td>
                  <td>{formatSellRange(tier, g.pricingMode)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
