<?php
header('Content-Type: application/json');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Only POST method allowed'
    ]);
    exit;
}
function readJsonFile($filename) {
    if (!file_exists($filename)) {
        return null;
    }
    
    $jsonContent = file_get_contents($filename);
    if ($jsonContent === false) {
        return null;
    }
    
    $data = json_decode($jsonContent, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }
    
    return $data;
}

function writeJsonFile($filename, $data) {
    $jsonContent = json_encode($data, JSON_PRETTY_PRINT);
    if ($jsonContent === false) {
        return false;
    }
    
    return file_put_contents($filename, $jsonContent) !== false;
}

try {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        throw new Exception('No data received');
    }
    
    $requestData = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data');
    }
    
    // Validate order ID
    if (empty($requestData['orderId'])) {
        throw new Exception('Order ID is required');
    }
    
    $orderId = $requestData['orderId'];
    
    $carsFile = '../data/cars.json';
    $ordersFile = '../data/orders.json';
    
    $ordersData = readJsonFile($ordersFile);
    if ($ordersData === null || !isset($ordersData['orders'])) {
        throw new Exception('Unable to read orders data');
    }
    
    $orderIndex = -1;
    $targetOrder = null;
    
    foreach ($ordersData['orders'] as $index => $order) {
        if ($order['orderId'] === $orderId) {
            $orderIndex = $index;
            $targetOrder = $order;
            break;
        }
    }
    
    if ($orderIndex === -1) {
        throw new Exception('Order not found');
    }
    
    if ($targetOrder['status'] === 'confirmed') {
        throw new Exception('Order is already confirmed');
    }
    
    if ($targetOrder['status'] !== 'pending') {
        throw new Exception('Order cannot be confirmed (status: ' . $targetOrder['status'] . ')');
    }
    
    $carsData = readJsonFile($carsFile);
    if ($carsData === null || !isset($carsData['cars'])) {
        throw new Exception('Unable to read cars data');
    }
    
    $carIndex = -1;
    $targetCar = null;
    
    foreach ($carsData['cars'] as $index => $car) {
        if ($car['vin'] === $targetOrder['car']['vin']) {
            $carIndex = $index;
            $targetCar = $car;
            break;
        }
    }
    
    if ($carIndex === -1) {
        throw new Exception('Car not found');
    }
    
    if (!$targetCar['available']) {
        throw new Exception('Car is no longer available');
    }
    
    $ordersData['orders'][$orderIndex]['status'] = 'confirmed';
    $ordersData['orders'][$orderIndex]['confirmedAt'] = date('Y-m-d H:i:s');
    
    $carsData['cars'][$carIndex]['available'] = false;
    
    if (!writeJsonFile($ordersFile, $ordersData)) {
        throw new Exception('Failed to update order data');
    }
    
    if (!writeJsonFile($carsFile, $carsData)) {
        $ordersData['orders'][$orderIndex]['status'] = 'pending';
        unset($ordersData['orders'][$orderIndex]['confirmedAt']);
        writeJsonFile($ordersFile, $ordersData);
        throw new Exception('Failed to update car availability');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Order confirmed successfully',
        'orderId' => $orderId,
        'status' => 'confirmed'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>