<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Bon de livraison {{ $order->number }}</title>
    <style>
        @page { margin: 36px 40px; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11px;
            color: #16120e;
            line-height: 1.5;
        }
        .header { width: 100%; margin-bottom: 28px; }
        .brand { font-size: 20px; letter-spacing: 5px; text-transform: uppercase; }
        .muted { color: #6b6259; }
        .right { text-align: right; }
        h1 { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px; }
        .label {
            font-size: 9px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #9a7b3f;
            margin-bottom: 4px;
        }
        table { width: 100%; border-collapse: collapse; }
        .parties { margin-bottom: 22px; }
        .parties td { vertical-align: top; width: 50%; padding-right: 18px; }
        .items th {
            text-align: left;
            font-size: 9px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #6b6259;
            border-bottom: 1px solid #d9d1c4;
            padding: 6px 4px;
        }
        .items td { padding: 10px 4px; border-bottom: 1px solid #eee8dd; }
        .items .num { text-align: right; width: 60px; }
        .check { width: 34px; text-align: center; color: #9a7b3f; }
        .footer {
            margin-top: 30px;
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
                <div class="muted">Maison marocaine de parfums</div>
                <div class="muted">Adresse : [à compléter]</div>
            </td>
            <td class="right">
                <h1>Bon de livraison</h1>
                <div>{{ $order->number }}</div>
                <div class="muted">Imprimé le {{ $printedAt->format('d/m/Y à H:i') }}</div>
            </td>
        </tr>
    </table>

    <table class="parties">
        <tr>
            <td>
                <div class="label">Destinataire</div>
                <div>{{ $order->customer_name }}</div>
                <div class="muted">{{ $order->phone }}</div>
                @if ($order->email)
                    <div class="muted">{{ $order->email }}</div>
                @endif
            </td>
            <td>
                <div class="label">Adresse</div>
                <div>{{ $order->address['line1'] ?? '' }}</div>
                <div>{{ $order->address['district'] ?? '' }} — {{ $order->address['city'] ?? '' }}</div>
                @if (! empty($order->address['landmark']))
                    <div class="muted">{{ $order->address['landmark'] }}</div>
                @endif
                @if (! empty($order->note))
                    <div class="muted">Note client : {{ $order->note }}</div>
                @endif
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th class="check">✓</th>
                <th>Article</th>
                <th>Référence</th>
                <th class="num">Qté</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td class="check">☐</td>
                    <td>
                        {{ $item->product_name }}
                        @if ($item->variant_label)
                            <span class="muted">— {{ $item->variant_label }}</span>
                        @endif
                    </td>
                    <td class="muted">{{ $item->sku }}</td>
                    <td class="num">{{ $item->quantity }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        <div>Paiement : à la livraison — montant à encaisser : {{ \App\Support\Money::format($order->total_cents) }}.</div>
        <div>Ce bon accompagne le colis. Il ne tient pas lieu de facture.</div>
    </div>
</body>
</html>
