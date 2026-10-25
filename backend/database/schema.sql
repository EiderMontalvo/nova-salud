CREATE TABLE usuarios (
  id_usuario INT PRIMARY KEY AUTO_INCREMENT, nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(100) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
  rol ENUM('ADMIN','VENDEDOR') NOT NULL DEFAULT 'VENDEDOR', activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE categorias (
  id_categoria INT PRIMARY KEY AUTO_INCREMENT, nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255), imagen VARCHAR(255), activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE productos (
  id_producto INT PRIMARY KEY AUTO_INCREMENT, id_categoria INT NOT NULL,
  codigo VARCHAR(50) NOT NULL UNIQUE, nombre VARCHAR(150) NOT NULL,
  descripcion TEXT, imagen VARCHAR(255), precio DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0, stock_minimo INT NOT NULL DEFAULT 5,
  fecha_vencimiento DATE, activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria), INDEX idx_producto_nombre(nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE clientes (
  id_cliente INT PRIMARY KEY AUTO_INCREMENT, nombre VARCHAR(100) NOT NULL,
  documento VARCHAR(20) UNIQUE, telefono VARCHAR(20), correo VARCHAR(100),
  fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE ventas (
  id_venta INT PRIMARY KEY AUTO_INCREMENT, id_usuario INT NOT NULL, id_cliente INT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, total DECIMAL(10,2) NOT NULL,
  metodo_pago ENUM('EFECTIVO','YAPE','PLIN','TARJETA') NOT NULL DEFAULT 'EFECTIVO',
  estado ENUM('COMPLETADA','ANULADA') NOT NULL DEFAULT 'COMPLETADA',
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario), FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
  INDEX idx_venta_fecha(fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE detalle_ventas (
  id_detalle INT PRIMARY KEY AUTO_INCREMENT, id_venta INT NOT NULL, id_producto INT NOT NULL,
  cantidad INT NOT NULL, precio_unitario DECIMAL(10,2) NOT NULL, subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES ventas(id_venta), FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE VIEW vista_stock_bajo AS SELECT p.id_producto, p.codigo, p.nombre, p.imagen, p.stock, p.stock_minimo, c.nombre AS categoria
FROM productos p JOIN categorias c ON c.id_categoria = p.id_categoria WHERE p.activo = 1 AND p.stock <= p.stock_minimo;
CREATE VIEW vista_productos_por_vencer AS SELECT id_producto, codigo, nombre, imagen, stock, fecha_vencimiento,
DATEDIFF(fecha_vencimiento, CURDATE()) AS dias_restantes FROM productos
WHERE activo = 1 AND stock > 0 AND fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY);
