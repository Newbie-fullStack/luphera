<?php

namespace App\Domain\Commerce\Enums;

enum CouponType: string
{
    case Percentage = 'percentage';
    case Fixed = 'fixed';
}
