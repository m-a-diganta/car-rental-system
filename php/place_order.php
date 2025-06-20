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

function validateOrderData($orderData) {
    $errors = [];
    
    if (empty($orderData['customer']['name']) || strlen(trim($orderData['customer']['name'])) < 2) {
        $errors[] = 'Invalid customer name';
    }
    
    if (empty($orderData['customer']['phoneNumber']) || !preg_match('/^\+?[\d\s\-\(\)]{10,15}$/', $orderData['customer']['phoneNumber'])) {
        $errors[] = 'Invalid phone number';
    }
    
    if (empty($orderData['customer']['email']) || !filter_var($orderData['customer']['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email address';
    }
    
    if (empty($orderData['customer']['driversLicenseNumber']) || strlen(trim($orderData['customer']['driversLicenseNumber'])) < 5) {
        $errors[] = 'Invalid driver\'s license number';
    }
    
    if (empty($orderData['car']['vin']) || strlen($orderData['car']['vin']) !== 17) {
        $errors[] = 'Invalid car VIN';
    }
    
    if (empty($orderData['rental']['startDate'])) {
        $errors[] = 'Start date is required';
    } else {
        $startDate = strtotime($orderData['rental']['startDate']);
        $today = strtotime(date('Y-m-d'));
        if ($startDate < $today) {
            $errors[] = 'Start date cannot be in the past';
        }
    }
    
    if (empty($orderData['rental']['rentalPeriod']) || !is_numeric($orderData['rental']['rentalPeriod']) || 
        $orderData['rental']['rentalPeriod'] < 1 || $orderData['rental']['rentalPeriod'] > 365) {
        $errors[] = 'Invalid rental period (must be 1-365 days)';
    }
    
    if (empty($orderData['rental']['totalPrice']) || !is_numeric($orderData['rental']['totalPrice']) || $orderData['rental']['totalPrice'] <= 0) {
        $errors[] = 'Invalid total price';
    }
    
    return $errors;
}

try {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        throw new Exception('No data received');
    }
    
    $orderData = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data');
    }
    
    $validationErrors = validateOrderData($orderData);
    if (!empty($validationErrors)) {
        throw new Exception('Validation failed: ' . implode(', ', $validationErrors));
    }
    
    // File paths
    $carsFile = '../data/cars.json';
    $ordersFile = '../data/orders.json';
    
    $carsData = readJsonFile($carsFile);
    if ($carsData === null || !isset($carsData['cars'])) {
        throw new Exception('Unable to read cars data');
    }
    
    $carIndex = -1;
    $targetCar = null;
    
    foreach ($carsData['cars'] as $index => $car) {
        if ($car['vin'] === $orderData['car']['vin']) {
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
    
    $expectedPrice = $targetCar['pricePerDay'] * $orderData['rental']['rentalPeriod'];
    if (abs($expectedPrice - $orderData['rental']['totalPrice']) > 0.01) {
        throw new Exception('Price calculation mismatch');
    }
    
    $ordersData = readJsonFile($ordersFile);
    if ($ordersData === null) {
        $ordersData = ['orders' => []];
    }
    
    $orderId = uniqid('order_', true);
    
    $newOrder = $orderData;
    $newOrder['orderId'] = $orderId;
    $newOrder['status'] = 'pending';
    $newOrder['createdAt'] = date('Y-m-d H:i:s');
    
    $ordersData['orders'][] = $newOrder;
    
    if (!writeJsonFile($ordersFile, $ordersData)) {
        throw new Exception('Failed to save order data');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Order placed successfully',
        'orderId' => $orderId,
        'status' => 'pending'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>