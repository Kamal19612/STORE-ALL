package com.storeall.api.multistore;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.dto.OrderRequest;
import com.storeall.api.dto.OrderItemRequest;
import com.storeall.api.entity.Category;
import com.storeall.api.entity.Product;
import com.storeall.api.entity.Store;
import com.storeall.api.entity.User;
import com.storeall.api.repository.CategoryRepository;
import com.storeall.api.repository.OrderRepository;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.repository.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MultiStoreIsolationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Autowired StoreRepository storeRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired ProductRepository productRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired UserRepository userRepository;

    Store sucre;
    Store spirit;
    Product sucreProduct;
    Product spiritProduct;

    @BeforeEach
    void setup() {
        orderRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();
        storeRepository.deleteAll();

        sucre = storeRepository.save(Store.builder().code("sucre").name("SUCRE STORE").build());
        spirit = storeRepository.save(Store.builder().code("spirit").name("SPIRIT STORE").build());

        Category catSucre = categoryRepository.save(Category.builder().store(sucre).name("CatSucre").slug("catsucre").active(true).build());
        Category catSpirit = categoryRepository.save(Category.builder().store(spirit).name("CatSpirit").slug("catspirit").active(true).build());

        sucreProduct = productRepository.save(Product.builder()
            .store(sucre)
            .name("Sucre Product")
            .slug("sucre-product")
            .price(new BigDecimal("1000"))
            .stock(10)
            .active(true)
            .mainImage("x")
            .category(catSucre)
            .build());

        spiritProduct = productRepository.save(Product.builder()
            .store(spirit)
            .name("Spirit Product")
            .slug("spirit-product")
            .price(new BigDecimal("2000"))
            .stock(10)
            .active(true)
            .mainImage("x")
            .category(catSpirit)
            .build());

        userRepository.save(User.builder()
            .store(sucre)
            .username("admin_sucre")
            .email("admin_sucre@test.local")
            .password("x")
            .role(User.Role.MANAGER)
            .active(true)
            .build());

        userRepository.save(User.builder()
            .store(spirit)
            .username("super_global")
            .email("super_global@test.local")
            .password("x")
            .role(User.Role.SUPER_ADMIN)
            .active(true)
            .build());
    }

    @Test
    void publicCatalog_isolatedByHeaderStoreCode() throws Exception {
        mockMvc.perform(get("/api/products")
            .header("X-Store-Code", "sucre"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].slug").value("sucre-product"));

        mockMvc.perform(get("/api/products")
            .header("X-Store-Code", "spirit"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].slug").value("spirit-product"));
    }

    @Test
    void orders_createdInRightStore_andManagerCannotCrossStore() throws Exception {
        OrderRequest reqSucre = new OrderRequest();
        reqSucre.setCustomerName("A");
        reqSucre.setCustomerPhone("+226 000");
        reqSucre.setCustomerAddress("Addr");
        reqSucre.setDeliveryType("STANDARD");
        OrderItemRequest it1 = new OrderItemRequest();
        it1.setProductId(sucreProduct.getId());
        it1.setQuantity(1);
        reqSucre.setItems(List.of(it1));
        reqSucre.setDeliveryCost(new BigDecimal("0"));
        reqSucre.setDistance(new BigDecimal("1"));
        reqSucre.setTotalAmount(new BigDecimal("1000"));

        mockMvc.perform(post("/api/orders")
            .header("X-Store-Code", "sucre")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(reqSucre)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orderNumber").exists());

        OrderRequest reqSpirit = new OrderRequest();
        reqSpirit.setCustomerName("B");
        reqSpirit.setCustomerPhone("+226 111");
        reqSpirit.setCustomerAddress("Addr2");
        reqSpirit.setDeliveryType("STANDARD");
        OrderItemRequest it2 = new OrderItemRequest();
        it2.setProductId(spiritProduct.getId());
        it2.setQuantity(1);
        reqSpirit.setItems(List.of(it2));
        reqSpirit.setDeliveryCost(new BigDecimal("0"));
        reqSpirit.setDistance(new BigDecimal("1"));
        reqSpirit.setTotalAmount(new BigDecimal("2000"));

        mockMvc.perform(post("/api/orders")
            .header("X-Store-Code", "spirit")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(reqSpirit)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orderNumber").exists());

        mockMvc.perform(get("/api/manager/" + sucre.getId() + "/orders")
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("admin_sucre").roles("MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));

        mockMvc.perform(get("/api/manager/" + spirit.getId() + "/orders")
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("admin_sucre").roles("MANAGER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "super_global", roles = {"SUPER_ADMIN"})
    void superAdminGlobalDelivery_canSeeAllOrdersAcrossStores() throws Exception {
        OrderRequest reqSucre = new OrderRequest();
        reqSucre.setCustomerName("A");
        reqSucre.setCustomerPhone("+226 000");
        reqSucre.setCustomerAddress("Addr");
        reqSucre.setDeliveryType("STANDARD");
        OrderItemRequest it3 = new OrderItemRequest();
        it3.setProductId(sucreProduct.getId());
        it3.setQuantity(1);
        reqSucre.setItems(List.of(it3));
        reqSucre.setDeliveryCost(new BigDecimal("0"));
        reqSucre.setDistance(new BigDecimal("1"));
        reqSucre.setTotalAmount(new BigDecimal("1000"));
        mockMvc.perform(post("/api/orders")
            .header("X-Store-Code", "sucre")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(reqSucre)))
            .andExpect(status().isOk());

        OrderRequest reqSpirit = new OrderRequest();
        reqSpirit.setCustomerName("B");
        reqSpirit.setCustomerPhone("+226 111");
        reqSpirit.setCustomerAddress("Addr2");
        reqSpirit.setDeliveryType("STANDARD");
        OrderItemRequest it4 = new OrderItemRequest();
        it4.setProductId(spiritProduct.getId());
        it4.setQuantity(1);
        reqSpirit.setItems(List.of(it4));
        reqSpirit.setDeliveryCost(new BigDecimal("0"));
        reqSpirit.setDistance(new BigDecimal("1"));
        reqSpirit.setTotalAmount(new BigDecimal("2000"));
        mockMvc.perform(post("/api/orders")
            .header("X-Store-Code", "spirit")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(reqSpirit)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/delivery/global/orders")
            .header("X-Store-Code", "sucre"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(2));

        mockMvc.perform(get("/api/delivery/global/orders?storeCode=spirit")
            .header("X-Store-Code", "sucre"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    @WithMockUser(username = "super_global", roles = {"SUPER_ADMIN"})
    void superAdminSupervision_apiWorksWithoutXStoreCode() throws Exception {
        mockMvc.perform(get("/api/super/stores"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser(username = "super_global", roles = {"SUPER_ADMIN"})
    void exportProductsCsv_containsHeaderRow() throws Exception {
        mockMvc.perform(get("/api/manager/" + spirit.getId() + "/products/export-csv"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("attachment")))
            .andExpect(content().string(containsString("Nom")));
    }

    @Test
    @WithMockUser(username = "super_global", roles = {"SUPER_ADMIN"})
    void superExportProductsCsv_allStores_containsStoreCodeColumn() throws Exception {
        mockMvc.perform(get("/api/super/products/export-csv"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("all-stores")))
            .andExpect(content().string(containsString("store_code")));
    }

    @Test
    @WithMockUser(username = "super_global", roles = {"SUPER_ADMIN"})
    void superImportStoresCsv_createsStore() throws Exception {
        String csv = "code,name,phone\nfromcsv,From CSV,+123456\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "stores.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart("/api/super/stores/import-csv").file(file))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.successCount").value(1));
        org.junit.jupiter.api.Assertions.assertTrue(storeRepository.findByCode("fromcsv").isPresent());
    }
}
