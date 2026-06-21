package com.storeall.api.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.storeall.api.dto.ProductRequest;
import com.storeall.api.dto.ProductResponse;
import com.storeall.api.entity.Category;
import com.storeall.api.entity.Product;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.CategoryRepository;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.tenant.StoreContext;

@ExtendWith(MockitoExtension.class)
public class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductPdfService productPdfService;

    @InjectMocks
    private ProductService productService;

    private Product product;
    private Category category;
    private ProductRequest productRequest;
    private Store store;

    @BeforeEach
    public void setUp() {
        store = Store.builder().id(1L).code("sucre").name("SUCRE").build();
        StoreContext.set(store);

        category = Category.builder()
                .id(1L)
                .store(store)
                .name("Electronics")
                .slug("electronics")
                .active(true)
                .build();

        product = Product.builder()
                .id(1L)
                .store(store)
                .name("Laptop")
                .slug("laptop")
                .shortDescription("A powerful laptop")
                .description("Detailed description")
                .price(new BigDecimal("999.99"))
                .stock(10)
                .active(true)
                .category(category)
                .build();

        productRequest = new ProductRequest();
        productRequest.setName("Laptop");
        productRequest.setSlug("laptop");
        productRequest.setCategoryId(1L);
        productRequest.setPrice(new BigDecimal("999.99"));
        productRequest.setStock(10);
        productRequest.setActive(true);

        lenient().when(productPdfService.templateDisplayName(any(Product.class))).thenReturn(null);
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        StoreContext.clear();
    }

    @Test
    void testGetPublicCatalogPage() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> productPage = new PageImpl<>(List.of(product));

        when(productRepository.findCatalogPageAllStatuses(1L, pageable)).thenReturn(productPage);

        Page<ProductResponse> result = productService.getPublicCatalogPage(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Laptop", result.getContent().get(0).getName());
        verify(productRepository, times(1)).findCatalogPageAllStatuses(1L, pageable);
    }

    @Test
    void testGetPublicCatalogFullList() {
        when(productRepository.findCatalogListAllStatuses(1L)).thenReturn(List.of(product));

        List<ProductResponse> result = productService.getPublicCatalogFullList();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Laptop", result.get(0).getName());
        verify(productRepository, times(1)).findCatalogListAllStatuses(1L);
    }

    @Test
    void testGetProductBySlug_Success() {
        when(productRepository.findBySlugAndStoreId("laptop", 1L)).thenReturn(Optional.of(product));

        ProductResponse result = productService.getProductBySlug("laptop");

        assertNotNull(result);
        assertEquals("Laptop", result.getName());
        verify(productRepository, times(1)).findBySlugAndStoreId("laptop", 1L);
    }

    @Test
    void testGetProductBySlug_NotFound() {
        when(productRepository.findBySlugAndStoreId("unknown", 1L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> productService.getProductBySlug("unknown"));
        assertEquals("Produit introuvable : unknown", exception.getMessage());
        verify(productRepository, times(1)).findBySlugAndStoreId("unknown", 1L);
    }

    @Test
    void testCreateProduct() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductResponse result = productService.createProduct(productRequest, "image-url.jpg", java.util.List.of(), null);

        assertNotNull(result);
        assertEquals("Laptop", result.getName());
        verify(categoryRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(any(Product.class));
    }
}
