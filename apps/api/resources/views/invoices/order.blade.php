<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Facture {{ $invoiceNumber }}</title>
    <style>
        @page { margin: 36px 40px; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11px;
            color: #16120e;
            line-height: 1.5;
        }
        .header { width: 100%; margin-bottom: 32px; }
        .brand {
            font-size: 20px;
            letter-spacing: 5px;
            text-transform: uppercase;
        }
        .muted { color: #6b6259; }
        .gold { color: #9a7b3f; }
        .right { text-align: right; }
        .meta { margin-top: 4px; }
        h1 {
            font-size: 13px;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin: 0 0 8px;
        }
        table { width: 100%; border-collapse: collapse; }
        .parties { margin-bottom: 26px; }
        .parties td { vertical-align: top; width: 50%; padding-right: 18px; }
        .label {
            font-size: 9px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #9a7b3f;
            margin-bottom: 4px;
        }
        .items th {
            text-align: left;
            font-size: 9px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #6b6259;
            border-bottom: 1px solid #d9d1c4;
            padding: 6px 4px;
        }
        .items td {
            padding: 8px 4px;
            border-bottom: 1px solid #eee8dd;
        }
        .items .num { text-align: right; white-space: nowrap; }
        .totals { width: 46%; margin-left: 54%; margin-top: 12px; }
        .totals td { padding: 4px 0; }
        .totals .num { text-align: right; white-space: nowrap; }
        .totals .grand {
            border-top: 1px solid #16120e;
            font-size: 12px;
            padding-top: 8px;
        }
        .footer {
            margin-top: 36px;
            padding-top: 12px;
            border-top: 1px solid #d9d1c4;
            font-size: 9px;
            color: #6b6259;
        }
    </style>
</head>
<body>
    <table class="header">
        <tr>
            <td>
                <div class="brand">Luphéra</div>
                <div class="muted meta">Maison marocaine de parfums</div>
                <div class="muted meta">Adresse : [à compléter]</div>
                <div class="muted meta">Téléphone : [à compléter]</div>
            </td>
            <td class="right">
                <h1>Facture</h1>
                <div>{{ $invoiceNumber }}</div>
                <div class="muted">Émise le {{ $issuedAt->format('d/m/Y') }}</div>
                <div class="muted">Commande {{ $order->number }}</div>
            </td>
        </tr>
    </table>

    <table class="parties">
        <tr>
            <td>
                <div class="label">Client</div>
                <div>{{ $order->customer_name }}</div>
                <div class="muted">{{ $order->phone }}</div>
                @if ($order->email)
                    <div class="muted">{{ $order->email }}</div>
                @endif
            </td>
            <td>
                <div class="label">Livraison</div>
                <div>{{ $order->address['line1'] ?? '' }}</div>
                <div>{{ $order->address['district'] ?? '' }} — {{ $order->address['city'] ?? '' }}</div>
                @if (! empty($order->address['landmark']))
                    <div class="muted">{{ $order->address['landmark'] }}</div>
                @endif
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th>Désignation</th>
                <th>Référence</th>
                <th class="num">Qté</th>
                <th class="num">Prix unitaire</th>
                <th class="num">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>
                        {{ $item->product_name }}
                        @if ($item->variant_label)
                            <span class="muted">— {{ $item->variant_label }}</span>
                        @endif
                    </td>
                    <td class="muted">{{ $item->sku }}</td>
                    <td class="num">{{ $item->quantity }}</td>
                    <td class="num">{{ \App\Support\Money::format($item->unit_price_cents) }}</td>
                    <td class="num">{{ \App\Support\Money::format($item->line_total_cents) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td class="muted">Sous-total</td>
            <td class="num">{{ \App\Support\Money::format($order->subtotal_cents) }}</td>
        </tr>
        @if ($order->discount_cents > 0)
            <tr>
                <td class="muted">
                    Remise
                    @if ($order->coupon_code)
                        · {{ $order->coupon_code }}
                    @endif
                </td>
                <td class="num">−{{ \App\Support\Money::format($order->discount_cents) }}</td>
            </tr>
        @endif
        <tr>
            <td class="muted">Livraison</td>
            <td class="num">
                @if ($order->shipping_cents === 0)
                    Offerte
                @else
                    {{ \App\Support\Money::format($order->shipping_cents) }}
                @endif
            </td>
        </tr>
        <tr class="grand">
            <td>Total</td>
            <td class="num">{{ \App\Support\Money::format($order->total_cents) }}</td>
        </tr>
    </table>

    <div class="footer">
        <div>Règlement : paiement à la livraison.</div>
        <div>ICE : [à compléter] · RC : [à compléter] · Patente : [à compléter] · IF : [à compléter]</div>
        <div>Document généré par la boutique Luphéra. Les mentions légales définitives restent à compléter.</div>
    </div>
</body>
</html>
