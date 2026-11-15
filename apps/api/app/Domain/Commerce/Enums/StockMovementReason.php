<?php

namespace App\Domain\Commerce\Enums;

enum StockMovementReason: string
{
    case Order = 'order';
    case Return = 'return';
    case Adjust = 'adjust';
    case Restock = 'restock';
}
