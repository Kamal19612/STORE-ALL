package com.storeall.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class NotificationAsyncConfig {

    @Bean(name = "notificationExecutor")
    public TaskExecutor notificationExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(4);
        exec.setMaxPoolSize(16);
        exec.setQueueCapacity(500);
        exec.setThreadNamePrefix("notif-");
        exec.setWaitForTasksToCompleteOnShutdown(false);
        exec.initialize();
        return exec;
    }
}

