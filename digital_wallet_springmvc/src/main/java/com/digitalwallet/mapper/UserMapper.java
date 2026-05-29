package com.digitalwallet.mapper;

import com.digitalwallet.model.User;
import org.apache.ibatis.annotations.Param;

public interface UserMapper {
    void insert(User user);
    User findByUsername(@Param("username") String username);
}
