package com.storeall.api.multistore;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "tenant.requireExplicitStore=true"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StrictStoreHeaderTest {

    @Autowired MockMvc mockMvc;

    @Test
    void missingStoreHeader_returns400() throws Exception {
        mockMvc.perform(get("/api/products"))
            .andExpect(status().isBadRequest());
    }
}

