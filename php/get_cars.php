<?php
header('Content-Type: application/json');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
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

try {
    // File path
    $carsFile = '../data/cars.json';
    
    $carsData = readJsonFile($carsFile);
    if ($carsData === null || !isset($carsData['cars'])) {
        throw new Exception('Unable to read cars data');
    }
    
    if (isset($_GET['vin']) && !empty($_GET['vin'])) {
        $requestedVin = $_GET['vin'];
        $filteredCars = array_filter($carsData['cars'], function($car) use ($requestedVin) {
            return $car['vin'] === $requestedVin;
        });
        
        echo json_encode([
            'success' => true,
            'cars' => array_values($filteredCars)
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'cars' => $carsData['cars']
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'cars' => []
    ]);
}
?>