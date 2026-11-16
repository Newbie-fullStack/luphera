<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Commerce\Enums\OrderStatus;
use App\Domain\Commerce\Models\Order;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Invoices exist only for delivered orders: an order still in transit can
 * change, and the brief ties the document to a completed delivery.
 */
class InvoiceController extends Controller
{
    public function show(Request $request, string $number): Response|JsonResponse
    {
        $order = Order::query()
            ->where('user_id', $this->user($request)->id)
            ->where('number', $number)
            ->with(['items'])
            ->first();

        if ($order === null) {
            return ApiResponse::error('Cette commande est introuvable.', [], 404, 'not_found');
        }

        if ($order->status !== OrderStatus::Delivered) {
            return ApiResponse::error(
                'La facture sera disponible une fois la commande livrée.',
                [],
                422,
                'invoice_unavailable',
            );
        }

        $pdf = Pdf::loadView('invoices.order', [
            'order' => $order,
            'invoiceNumber' => 'FAC-'.$order->number,
            'issuedAt' => now(),
        ])->setPaper('a4');

        return $pdf->download('facture-'.$order->number.'.pdf');
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
