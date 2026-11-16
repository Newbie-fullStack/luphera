<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Account\Models\Address;
use App\Domain\Account\Services\AddressBook;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\AddressRequest;
use App\Http\Resources\Account\AddressResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function __construct(private readonly AddressBook $book) {}

    public function index(Request $request): JsonResponse
    {
        $addresses = $this->user($request)
            ->addresses()
            ->with('city')
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->get();

        return ApiResponse::data(
            $addresses->map(fn (Address $address): array => AddressResource::make($address))->all(),
        );
    }

    public function store(AddressRequest $request): JsonResponse
    {
        $address = $this->book->create($this->user($request), $request->validated());

        return ApiResponse::data(AddressResource::make($address->load('city')), [], 201);
    }

    public function update(AddressRequest $request, Address $address): JsonResponse
    {
        $this->ensureOwner($request, $address);

        $updated = $this->book->update($address, $request->validated());

        return ApiResponse::data(AddressResource::make($updated->load('city')));
    }

    public function destroy(Request $request, Address $address): JsonResponse
    {
        $this->ensureOwner($request, $address);

        $this->book->delete($address);

        return ApiResponse::data(null);
    }

    /**
     * A foreign address answers 404, never 403: the existence of another
     * customer's address must not be discoverable.
     */
    private function ensureOwner(Request $request, Address $address): void
    {
        abort_unless($address->user_id === $this->user($request)->id, 404);
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
