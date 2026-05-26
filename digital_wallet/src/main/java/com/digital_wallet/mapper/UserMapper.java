package com.digital_wallet.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.digital_wallet.model.entity.User;

@Mapper
public interface UserMapper {
    int insert(User user);

    User findByUsername(String username);
}
